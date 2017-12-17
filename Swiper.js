import React from 'react';
import PropTypes from 'prop-types';
import { PanResponder, Text, View, Dimensions, Animated } from 'react-native';
import styles from './styles';

const { height, width } = Dimensions.get('window');
const LABEL_TYPES = {
  NONE: 'none',
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom',
};

class Swiper extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pan: new Animated.ValueXY(),
      scale: new Animated.Value(props.secondCardZoom),
      previousCardX: new Animated.Value(props.previousCardInitialPositionX),
      previousCardY: new Animated.Value(props.previousCardInitialPositionY),
      panResponderLocked: false,
      labelType: LABEL_TYPES.NONE,
      slideGesture: false,
    };
  }

  componentWillMount() {
    this._animatedValueX = 0;
    this._animatedValueY = 0;

    this.state.pan.x.addListener(value => (this._animatedValueX = value.value));
    this.state.pan.y.addListener(value => (this._animatedValueY = value.value));

    this.initializeCardStyle();
    this.initializePanResponder();
  }

  componentWillUnmount() {
    this.state.pan.x.removeAllListeners();
    this.state.pan.y.removeAllListeners();
  }

  initializeCardStyle = () => {
    const {
      cardVerticalMargin,
      cardHorizontalMargin,
      marginTop,
      marginBottom,
    } = this.props;

    const cardWidth = width - cardHorizontalMargin * 2;
    const cardHeight =
      height - cardVerticalMargin * 2 - marginTop - marginBottom;

    this.cardStyle = {
      top: cardVerticalMargin,
      left: cardHorizontalMargin,
      width: cardWidth,
      height: cardHeight,
    };

    this.customCardStyle = this.props.cardStyle;
  }

  initializePanResponder = () => {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (event, gestureState) => true,
      onMoveShouldSetPanResponder: (event, gestureState) => false,

      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        const isVerticalSwipe = Math.sqrt(Math.pow(gestureState.dx, 2) < Math.pow(gestureState.dy, 2));
        if (!this.props.verticalSwipe && isVerticalSwipe) {
          return false;
        }
        return Math.sqrt(Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2)) > 10;
      },
      onPanResponderGrant: this.onPanResponderGrant,
      onPanResponderMove: this.onPanResponderMove,
      onPanResponderRelease: this.onPanResponderRelease,
      onPanResponderTerminate: this.onPanResponderRelease,
    });
  }

  createAnimatedEvent = () => {
    const { horizontalSwipe, verticalSwipe } = this.props;
    const { x, y } = this.state.pan;
    const dx = horizontalSwipe ? x : 0;
    const dy = verticalSwipe ? y : 0;
    return { dx, dy };
  }

  onPanResponderMove = (event, gestureState) => {
    let { overlayOpacityHorizontalThreshold, overlayOpacityVerticalThreshold } = this.props;
    if (!overlayOpacityHorizontalThreshold) {
      overlayOpacityHorizontalThreshold = this.props.horizontalThreshold;
    }
    if (!overlayOpacityVerticalThreshold) {
      overlayOpacityVerticalThreshold = this.props.verticalThreshold;
    }

    let isSwipingLeft,
      isSwipingRight,
      isSwipingTop,
      isSwipingBottom;

    if (Math.abs(this._animatedValueX) > Math.abs(this._animatedValueY) && Math.abs(this._animatedValueX) > overlayOpacityHorizontalThreshold) {
      if (this._animatedValueX > 0) isSwipingRight = true;
      else isSwipingLeft = true;
    } else if (Math.abs(this._animatedValueY) > Math.abs(this._animatedValueX) && Math.abs(this._animatedValueY) > overlayOpacityVerticalThreshold) {
      if (this._animatedValueY > 0) isSwipingBottom = true;
      else isSwipingTop = true;
    }

    if (isSwipingRight) {
      this.setState({ labelType: LABEL_TYPES.RIGHT });
    } else if (isSwipingLeft) {
      this.setState({ labelType: LABEL_TYPES.LEFT });
    } else if (isSwipingTop) {
      this.setState({ labelType: LABEL_TYPES.TOP });
    } else if (isSwipingBottom) {
      this.setState({ labelType: LABEL_TYPES.BOTTOM });
    } else {
      this.setState({ labelType: LABEL_TYPES.NONE });
    }

    const { onTapCardDeadZone } = this.props;
    if (
      this._animatedValueX < -onTapCardDeadZone ||
      this._animatedValueX > onTapCardDeadZone ||
      this._animatedValueY < -onTapCardDeadZone ||
      this._animatedValueY > onTapCardDeadZone
    ) {
      this.setState({
        slideGesture: true,
      });
    }

    return Animated.event([null, this.createAnimatedEvent()])(
      event,
      gestureState,
    );
  }

  onPanResponderGrant = (event, gestureState) => {
    if (!this.state.panResponderLocked) {
      this.state.pan.setOffset({
        x: this._animatedValueX,
        y: this._animatedValueY,
      });
    }

    this.state.pan.setValue({
      x: 0,
      y: 0,
    });
  }

  validPanResponderRelease = () => {
    const {
      disableBottomSwipe,
      disableLeftSwipe,
      disableRightSwipe,
      disableTopSwipe,
    } = this.props;

    const {
      isSwipingLeft,
      isSwipingRight,
      isSwipingTop,
      isSwipingBottom,
    } = this.getSwipeDirection(this._animatedValueX, this._animatedValueY);

    return (
      (isSwipingLeft && !disableLeftSwipe) ||
      (isSwipingRight && !disableRightSwipe) ||
      (isSwipingTop && !disableTopSwipe) ||
      (isSwipingBottom && !disableBottomSwipe)
    );
  }

  onPanResponderRelease = (e, gestureState) => {
    if (this.state.panResponderLocked) {
      this.state.pan.setValue({
        x: 0,
        y: 0,
      });
      this.state.pan.setOffset({
        x: 0,
        y: 0,
      });

      return;
    }

    const { horizontalThreshold, verticalThreshold } = this.props;

    const animatedValueX = Math.abs(this._animatedValueX);
    const animatedValueY = Math.abs(this._animatedValueY);

    const isSwiping =
      animatedValueX > horizontalThreshold || animatedValueY > verticalThreshold;

    if (isSwiping && this.validPanResponderRelease()) {
      const onSwipeDirectionCallback = this.getOnSwipeDirectionCallback(
        this._animatedValueX,
        this._animatedValueY,
      );

      this.setState({ panResponderLocked: true }, () => {
        this.swipeCard(onSwipeDirectionCallback);
        this.zoomNextCard();
      });
    } else {
      this.resetTopCard();
    }

    if (!this.state.slideGesture) {
      this.props.onTapCard(this.state.firstCardIndex);
    }

    this.setState({
      labelType: LABEL_TYPES.NONE,
      slideGesture: false,
    });
  }

  getOnSwipeDirectionCallback = (animatedValueX, animatedValueY) => {
    const {
      onSwipedLeft,
      onSwipedRight,
      onSwipedTop,
      onSwipedBottom,
    } = this.props;

    const {
      isSwipingLeft,
      isSwipingRight,
      isSwipingTop,
      isSwipingBottom,
    } = this.getSwipeDirection(animatedValueX, animatedValueY);

    if (isSwipingRight) {
      return onSwipedRight;
    } else if (isSwipingLeft) {
      return onSwipedLeft;
    } else if (isSwipingTop) {
      return onSwipedTop;
    } else if (isSwipingBottom) {
      return onSwipedBottom;
    }
  }

  getSwipeDirection(animatedValueX, animatedValueY) {
    const isSwipingLeft = animatedValueX < -this.props.horizontalThreshold;
    const isSwipingRight = animatedValueX > this.props.horizontalThreshold;
    const isSwipingTop = animatedValueY < -this.props.verticalThreshold;
    const isSwipingBottom = animatedValueY > this.props.verticalThreshold;

    return {
      isSwipingLeft, isSwipingRight, isSwipingTop, isSwipingBottom,
    };
  }

  resetTopCard = (cb) => {
    Animated.spring(this.state.pan, {
      toValue: 0,
    }).start(cb);

    this.state.pan.setOffset({
      x: 0,
      y: 0,
    });
  }

  swipeBack = (cb) => {
    Animated.spring(this.state.previousCardY, {
      toValue: 0,
      friction: this.props.swipeBackFriction,
      duration: this.props.swipeBackAnimationDuration,
    }).start(() => {});
  }

  swipeLeft = (mustDecrementCardIndex = false) => {
    this.zoomNextCard();

    this.swipeCard(
      this.props.onSwipedLeft,
      -this.props.horizontalThreshold,
      0,
      mustDecrementCardIndex,
    );
  }

  swipeRight = (mustDecrementCardIndex = false) => {
    this.zoomNextCard();

    this.swipeCard(
      this.props.onSwipedRight,
      this.props.horizontalThreshold,
      0,
      mustDecrementCardIndex,
    );
  }

  swipeTop = (mustDecrementCardIndex = false) => {
    this.zoomNextCard();

    this.swipeCard(
      this.props.onSwipedTop,
      0,
      -this.props.verticalThreshold,
      mustDecrementCardIndex,
    );
  }

  swipeBottom = (mustDecrementCardIndex = false) => {
    this.zoomNextCard();

    this.swipeCard(
      this.props.onSwipedBottom,
      0,
      this.props.verticalThreshold,
      mustDecrementCardIndex,
    );
  }

  swipeCard = (
    onSwiped,
    x = this._animatedValueX,
    y = this._animatedValueY,
    mustDecrementCardIndex = false,
  ) => {
    Animated.timing(this.state.pan, {
      toValue: {
        x: x * 4.5,
        y: y * 4.5,
      },
      duration: this.props.swipeAnimationDuration,
    }).start(() => {
      this.onSwipedCallbacks(onSwiped, false);
      this.setState({ panResponderLocked: false }, this.resetPanAndScale)
    });
  }

  zoomNextCard = () => {
    Animated.spring(this.state.scale, {
      toValue: 1,
      friction: this.props.zoomFriction,
      duration: this.props.zoomAnimationDuration,
    }).start();
  }

  onSwipedCallbacks = (swipeDirectionCallback) => {
    this.props.onSwiped();
    swipeDirectionCallback();
  }

  resetPanAndScale = () => {
    this.state.pan.setValue({ x: 0, y: 0 });
    this.state.scale.setValue(this.props.secondCardZoom);

    this.state.previousCardX.setValue(this.props.previousCardInitialPositionX);
    this.state.previousCardY.setValue(this.props.previousCardInitialPositionY);
  }

  calculateOverlayLabelStyle = () => {
    let overlayLabelStyle = this.props.overlayLabels[this.state.labelType].style.label;

    if (this.state.labelType === LABEL_TYPES.NONE) {
      overlayLabelStyle = styles.hideOverlayLabel;
    }

    return [this.props.overlayLabelStyle, overlayLabelStyle];
  }

  calculateOverlayLabelWrapperStyle = () => {
    const dynamicStyles = this.props.overlayLabels[this.state.labelType].style.wrapper;

    const opacity = this.props.animateOverlayLabelsOpacity
      ? this.interpolateOverlayLabelsOpacity()
      : 1;
    return [this.props.overlayLabelWrapperStyle, dynamicStyles, { opacity }];
  }

  calculateSwipableCardStyle = () => {
    const opacity = this.props.animateCardOpacity
      ? this.interpolateCardOpacity()
      : 1;
    const rotation = this.interpolateRotation();

    return [
      styles.card,
      this.cardStyle,
      {
        zIndex: 3,
        opacity,
        transform: [
          { translateX: this.state.pan.x },
          { translateY: this.state.pan.y },
          { rotate: rotation },
        ],
      },
      this.customCardStyle,
    ];
  }

  calculateSecondCardZoomStyle = () => [
    styles.card,
    this.cardStyle,
    {
      zIndex: 1,
      transform: [{ scale: this.state.scale }],
    },
    this.customCardStyle,
  ]

  calculateSwipeBackCardStyle = () => [
    styles.card,
    this.cardStyle,
    {
      zIndex: 4,
      transform: [
        { translateX: this.state.previousCardX },
        { translateY: this.state.previousCardY },
      ],
    },
    this.customCardStyle,
  ]

  interpolateCardOpacity = () => {
    const animatedValueX = Math.abs(this._animatedValueX);
    const animatedValueY = Math.abs(this._animatedValueY);
    let opacity;

    if (animatedValueX > animatedValueY) {
      opacity = this.state.pan.x.interpolate({
        inputRange: this.props.inputCardOpacityRangeX,
        outputRange: this.props.outputCardOpacityRangeX,
      });
    } else {
      opacity = this.state.pan.y.interpolate({
        inputRange: this.props.inputCardOpacityRangeY,
        outputRange: this.props.outputCardOpacityRangeY,
      });
    }

    return opacity;
  }

  interpolateOverlayLabelsOpacity = () => {
    const animatedValueX = Math.abs(this._animatedValueX);
    const animatedValueY = Math.abs(this._animatedValueY);
    let opacity;

    if (animatedValueX > animatedValueY) {
      opacity = this.state.pan.x.interpolate({
        inputRange: this.props.inputOverlayLabelsOpacityRangeX,
        outputRange: this.props.outputOverlayLabelsOpacityRangeX,
      });
    } else {
      opacity = this.state.pan.y.interpolate({
        inputRange: this.props.inputOverlayLabelsOpacityRangeY,
        outputRange: this.props.outputOverlayLabelsOpacityRangeY,
      });
    }

    return opacity;
  }

  interpolateRotation = () =>
    this.state.pan.x.interpolate({
      inputRange: this.props.inputRotationRange,
      outputRange: this.props.outputRotationRange,
    })

  render() {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: this.props.backgroundColor,
            marginTop: this.props.marginTop,
            marginBottom: this.props.marginBottom,
          },
        ]}
      >
        {this.renderChildren()}
        {this.renderFirstCard()}
        {this.props.showSecondCard ? this.renderSecondCard() : null}
        {this.props.swipeBackCard ? this.renderSwipeBackCard() : null}
      </View>
    );
  }

  renderChildren = () => {
    const { childrenOnTop, children } = this.props;

    let zIndex = 1;
    if (childrenOnTop) {
      zIndex = 5;
    }

    return (
      <View style={[styles.childrenViewStyle, { zIndex }]}>
        {children}
      </View>
    );
  }

  renderFirstCard = () => {
    const { cards } = this.props;
    const swipableCardStyle = this.calculateSwipableCardStyle();
    const firstCardContent = cards[1];
    const firstCard = firstCardContent && this.props.renderCard(firstCardContent);
    const renderOverlayLabel = this.renderOverlayLabel();

    if (!firstCard) {
      return <Animated.View />;
    }

    return (
      <Animated.View
        style={swipableCardStyle}
        key="1"
        {...this._panResponder.panHandlers}
      >
        {renderOverlayLabel}
        {firstCard}
      </Animated.View>
    );
  }

  renderSecondCard = () => {
    const { cards: [_, __, nextCardContent], renderCard } = this.props;
    const nextCardZoomStyle = this.calculateSecondCardZoomStyle();
    const nextCard = nextCardContent && renderCard(nextCardContent);

    return nextCard ? (
      <Animated.View key="2" style={nextCardZoomStyle}>
        {nextCard}
      </Animated.View>
    ) : (
      <Animated.View key="0" />
    );
  }

  renderSwipeBackCard = () => {
    const { cards: [previousCardContent, currentContent] } = this.props;
    const previousCardStyle = this.calculateSwipeBackCardStyle();
    const previousCard = this.props.renderCard(previousCardContent);
    return (
      <Animated.View key="0" style={previousCardStyle}>
        {previousCard}
      </Animated.View>
    );
  }

  renderOverlayLabel = () => {
    const {
      disableBottomSwipe,
      disableLeftSwipe,
      disableRightSwipe,
      disableTopSwipe,
      overlayLabels,
    } = this.props;

    const { labelType } = this.state;

    const labelTypeNone = labelType === LABEL_TYPES.NONE;
    const directionSwipeLabelDisabled =
      (labelType === LABEL_TYPES.BOTTOM && disableBottomSwipe) ||
      (labelType === LABEL_TYPES.LEFT && disableLeftSwipe) ||
      (labelType === LABEL_TYPES.RIGHT && disableRightSwipe) ||
      (labelType === LABEL_TYPES.TOP && disableTopSwipe);

    if (
      !overlayLabels ||
      !overlayLabels[labelType] ||
      labelTypeNone ||
      directionSwipeLabelDisabled
    ) {
      return null;
    }

    return (
      <Animated.View style={this.calculateOverlayLabelWrapperStyle()}>
        { !overlayLabels[labelType].element &&
          <Text style={this.calculateOverlayLabelStyle()}>
            {overlayLabels[labelType].title}
          </Text>
        }

        { overlayLabels[labelType].element &&
          overlayLabels[labelType].element
        }
      </Animated.View>
    );
  }
}

Swiper.propTypes = {
  animateCardOpacity: PropTypes.bool,
  animateOverlayLabelsOpacity: PropTypes.bool,
  backgroundColor: PropTypes.string,
  cardHorizontalMargin: PropTypes.number,
  cardStyle: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  cardVerticalMargin: PropTypes.number,
  cards: PropTypes.array.isRequired,
  children: PropTypes.any,
  childrenOnTop: PropTypes.bool,
  disableBottomSwipe: PropTypes.bool,
  disableLeftSwipe: PropTypes.bool,
  disableRightSwipe: PropTypes.bool,
  disableTopSwipe: PropTypes.bool,
  horizontalSwipe: PropTypes.bool,
  horizontalThreshold: PropTypes.number,
  inputCardOpacityRangeX: PropTypes.array,
  inputCardOpacityRangeY: PropTypes.array,
  inputOverlayLabelsOpacityRangeX: PropTypes.array,
  inputOverlayLabelsOpacityRangeY: PropTypes.array,
  inputCardOpacityRange: PropTypes.array,
  inputRotationRange: PropTypes.array,
  marginBottom: PropTypes.number,
  marginTop: PropTypes.number,
  onSwiped: PropTypes.func,
  onSwipedAll: PropTypes.func,
  onSwipedBottom: PropTypes.func,
  onSwipedLeft: PropTypes.func,
  onSwipedRight: PropTypes.func,
  onSwipedTop: PropTypes.func,
  onTapCard: PropTypes.func,
  onTapCardDeadZone: PropTypes.number,
  outputCardOpacityRangeX: PropTypes.array,
  outputCardOpacityRangeY: PropTypes.array,
  outputOverlayLabelsOpacityRangeX: PropTypes.array,
  outputOverlayLabelsOpacityRangeY: PropTypes.array,
  outputRotationRange: PropTypes.array,
  outputCardOpacityRange: PropTypes.array,
  overlayLabels: PropTypes.object,
  overlayLabelStyle: PropTypes.object,
  overlayLabelWrapperStyle: PropTypes.object,
  overlayOpacityHorizontalThreshold: PropTypes.number,
  overlayOpacityVerticalThreshold: PropTypes.number,
  previousCardInitialPositionX: PropTypes.number,
  previousCardInitialPositionY: PropTypes.number,
  renderCard: PropTypes.func.isRequired,
  secondCardZoom: PropTypes.number,
  showSecondCard: PropTypes.bool,
  swipeAnimationDuration: PropTypes.number,
  swipeBackAnimationDuration: PropTypes.number,
  swipeBackCard: PropTypes.bool,
  swipeBackFriction: PropTypes.number,
  verticalSwipe: PropTypes.bool,
  verticalThreshold: PropTypes.number,
  zoomAnimationDuration: PropTypes.number,
  zoomFriction: PropTypes.number,
};

Swiper.defaultProps = {
  animateCardOpacity: false,
  animateOverlayLabelsOpacity: false,
  backgroundColor: '#4FD0E9',
  cardHorizontalMargin: 20,
  cardIndex: 0,
  cardStyle: {},
  cardVerticalMargin: 60,
  childrenOnTop: false,
  disableBottomSwipe: false,
  disableLeftSwipe: false,
  disableRightSwipe: false,
  disableTopSwipe: false,
  horizontalSwipe: true,
  horizontalThreshold: width / 4,
  inputCardOpacityRangeX: [-width / 2, -width / 3, 0, width / 3, width / 2],
  inputCardOpacityRangeY: [-height / 2, -height / 3, 0, height / 3, height / 2],
  inputOverlayLabelsOpacityRangeX: [
    -width / 3,
    -width / 4,
    0,
    width / 4,
    width / 3,
  ],
  inputOverlayLabelsOpacityRangeY: [
    -height / 4,
    -height / 5,
    0,
    height / 5,
    height / 4,
  ],
  inputRotationRange: [-width / 2, 0, width / 2],
  marginBottom: 0,
  marginTop: 0,
  onSwiped: (cardIndex) => {
    console.log(cardIndex);
  },
  onSwipedLeft: (cardIndex) => {
    console.log('onSwipedLeft');
  },
  onSwipedRight: (cardIndex) => {
    console.log('onSwipedRight');
  },
  onSwipedTop: (cardIndex) => {
    console.log('onSwipedTop');
  },
  onSwipedBottom: (cardIndex) => {
    console.log('onSwipedBottom');
  },
  onSwipedAll: () => {
    console.log('onSwipedAll');
  },
  onTapCard: (cardIndex) => {
    console.log(`Tapped card at ${cardIndex}`);
  },
  onTapCardDeadZone: 5,
  outputCardOpacityRangeX: [0.8, 1, 1, 1, 0.8],
  outputCardOpacityRangeY: [0.8, 1, 1, 1, 0.8],
  outputOverlayLabelsOpacityRangeX: [1, 0, 0, 0, 1],
  outputOverlayLabelsOpacityRangeY: [1, 0, 0, 0, 1],
  outputRotationRange: ['-10deg', '0deg', '10deg'],
  overlayLabels: null,
  overlayLabelStyle: {
    fontSize: 45,
    fontWeight: 'bold',
    borderRadius: 10,
    padding: 10,
    overflow: 'hidden',
  },
  overlayLabelWrapperStyle: {
    position: 'absolute',
    backgroundColor: 'transparent',
    zIndex: 2,
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlayOpacityHorizontalThreshold: width / 4,
  overlayOpacityVerticalThreshold: height / 5,
  previousCardInitialPositionX: 0,
  previousCardInitialPositionY: -height,
  secondCardZoom: 0.97,
  showSecondCard: true,
  swipeAnimationDuration: 350,
  swipeBackAnimationDuration: 600,
  swipeBackCard: false,
  swipeBackFriction: 11,
  verticalSwipe: true,
  verticalThreshold: height / 5,
  zoomAnimationDuration: 100,
  zoomFriction: 7,
};

export default Swiper;
