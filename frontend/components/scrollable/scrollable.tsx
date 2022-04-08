// global modules
import cn from 'classnames';
import type { HTMLAttributes, MouseEventHandler } from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

// local modules
import { ScrollableHolder, ScrollThumb } from './scrollable-holder';

export interface ScrollableProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Determine maximum height of container (by default full height of parent will be used)
   **/
  maxHeight?: string | number;
  offset?: number;
}

export function Scrollable({
  children,
  className,
  maxHeight,
  offset,
  ...restProps
}: ScrollableProps) {
  const scrollHostRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [stateDragging, setStateDragging] = useState(false);

  const dragging = useRef(false);
  const screenY = useRef(0);
  const deltaHeight = useRef(0);
  const scrollTop = useRef(0);

  const setTopForScroll = useCallback(() => {
    if (scrollHostRef.current) {
      const newTop = Number(
        (
          (100 - thumbHeight) *
          (scrollHostRef.current.scrollTop /
            (scrollHostRef.current.scrollHeight -
              scrollHostRef.current.clientHeight))
        ).toFixed(2)
      );
      setThumbTop(newTop);
    }
  }, [thumbHeight]);

  const handlerScroll = useCallback<MouseEventHandler<HTMLDivElement>>(
    (e) => {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.stopPropagation();
      setTopForScroll();
    },
    [setTopForScroll]
  );

  const handlerMouseMove = useCallback(
    (e: any): void => {
      if (dragging.current && scrollHostRef.current) {
        const deltaScrollHeight =
          scrollHostRef.current.scrollHeight -
          scrollHostRef.current.clientHeight;
        let delta =
          deltaHeight.current * (scrollTop.current / deltaScrollHeight) +
          (e.screenY - screenY.current);
        if (delta > deltaHeight.current) delta = deltaHeight.current;
        else if (delta < 0) delta = 0;

        const newScrollTop = Math.round(
          deltaScrollHeight * (delta / deltaHeight.current)
        );

        // set Scroll top
        if (scrollHostRef.current) {
          scrollHostRef.current.scrollTop = newScrollTop;
        }
      }
    },
    [deltaHeight, scrollTop, screenY]
  );

  const handlerMouseUp = useCallback((): void => {
    dragging.current = false;
    setStateDragging(false);

    window.removeEventListener('mousemove', handlerMouseMove, false);
    window.removeEventListener('mouseup', handlerMouseUp, false);
  }, [dragging, handlerMouseMove]);

  const handlerOnMouseDownThumb = useCallback<
    MouseEventHandler<HTMLDivElement>
  >(
    (e): void => {
      e.stopPropagation();
      e.preventDefault();

      dragging.current = true;
      setStateDragging(true);
      screenY.current = e.screenY;
      if (scrollHostRef.current && thumbRef.current) {
        deltaHeight.current =
          scrollHostRef.current?.clientHeight - thumbRef.current?.clientHeight;
        scrollTop.current = scrollHostRef.current?.scrollTop;
      }

      window.addEventListener('mousemove', handlerMouseMove, false);
      window.addEventListener('mouseup', handlerMouseUp, false);
    },
    [handlerMouseMove, handlerMouseUp]
  );
  const handlerOnMouseDownScrollBar = useCallback<
    MouseEventHandler<HTMLDivElement>
  >(
    (e) => {
      const { clientY } = e;
      if (scrollHostRef.current && thumbRef.current) {
        const deltaScrollHeight =
          scrollHostRef.current.scrollHeight -
          scrollHostRef.current.clientHeight;

        const trackHeight = scrollHostRef.current.clientHeight;
        const thumbHeight = thumbRef.current.getBoundingClientRect().height;

        const topPositionY =
          scrollHostRef.current.getBoundingClientRect().top + thumbHeight / 2;
        const deltaTopPosition = clientY - topPositionY;

        scrollHostRef.current.scrollTop =
          (deltaTopPosition * deltaScrollHeight) / (trackHeight - thumbHeight);
      }
      setTopForScroll();
    },
    [setTopForScroll]
  );

  useLayoutEffect(() => {
    if (scrollHostRef.current) {
      const newHeight =
        100 *
        Number(
          (
            scrollHostRef.current.clientHeight /
            scrollHostRef.current.scrollHeight
          ).toFixed(2)
        );

      if (newHeight !== thumbHeight) {
        setThumbHeight(newHeight === 100 ? 0 : newHeight);
      }
    }
  }, [
    thumbHeight,
    scrollHostRef.current?.clientHeight,
    scrollHostRef.current?.scrollHeight,
    maxHeight,
  ]);

  return (
    <ScrollableHolder maxHeight={maxHeight} offset={offset}>
      <div
        className={cn(
          'scrollHost',
          { scrollbarExist: !!thumbHeight },
          className
        )}
        {...restProps}
        ref={scrollHostRef}
        onScroll={handlerScroll}
      >
        {children}
      </div>
      <div
        className={cn('scrollbar', { exist: !!thumbHeight })}
        onMouseDown={handlerOnMouseDownScrollBar}
      >
        <ScrollThumb
          className={cn({ dragging: stateDragging })}
          ref={thumbRef}
          onMouseDown={handlerOnMouseDownThumb}
          onMouseUp={handlerMouseUp}
          style={{ height: `${thumbHeight}%`, top: `${thumbTop}%` }}
        />
      </div>
    </ScrollableHolder>
  );
}
