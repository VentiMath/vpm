import {
  useSwipeable,
  LEFT,
  RIGHT,
  UP,
  DOWN,
  type SwipeEventData,
  type SwipeableHandlers,
  type SwipeableProps,
} from "vreact-swipeable";
function View() {
  const options: SwipeableProps = {
    delta: { left: 20 },
    trackMouse: true,
    swipeDuration: 200,
    preventScrollOnSwipe: false,
    onSwiped(data: SwipeEventData) {
      const dir: typeof LEFT | typeof RIGHT | typeof UP | typeof DOWN =
        data.dir;
      void dir;
    },
  };
  const handlers: SwipeableHandlers = useSwipeable(options);
  return <div {...handlers} />;
}
// @ts-expect-error invalid direction
useSwipeable({ delta: { Left: 10 } });
// @ts-expect-error duration must be numeric
useSwipeable({ swipeDuration: "200" });
void View;
