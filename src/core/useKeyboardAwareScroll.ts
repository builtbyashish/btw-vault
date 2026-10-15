import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Keyboard,
  Platform,
  Dimensions,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

export interface FieldLayout {
  y: number;
  height: number;
}

export interface UseKeyboardAwareScrollOptions {
  topMargin?: number;            // Comfort margin from top bar (default 24)
  bottomMargin?: number;         // Comfort margin above keyboard (default 28)
  defaultPaddingBottom?: number; // Padding when keyboard is closed (default 40)
}

/**
 * Impeccable Keyboard-Aware Scroll hook:
 * - Prevents pushing inputs all the way to the top when focused at the bottom.
 * - Positions focused inputs with natural breathing room right above the keyboard.
 * - Avoids large blank spaces underneath inputs.
 * - Suppresses jumpy re-scrolling if the element is already comfortably visible.
 * - Seamlessly adapts whether the OS/KeyboardAvoidingView auto-resizes the container or not.
 */
export function useKeyboardAwareScroll(options?: UseKeyboardAwareScrollOptions) {
  const topMargin = options?.topMargin ?? 24;
  const bottomMargin = options?.bottomMargin ?? 28;
  const defaultPaddingBottom = options?.defaultPaddingBottom ?? 40;

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef<number>(0);
  const containerHeightRef = useRef<number>(0);
  const unconstrainedHeightRef = useRef<number>(0);
  const fieldLayoutsRef = useRef<Record<string, FieldLayout>>({});
  const activeFieldRef = useRef<string | null>(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Measure ScrollView container layout
  const handleScrollLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      containerHeightRef.current = h;
      if (keyboardHeight === 0 && h > 0) {
        unconstrainedHeightRef.current = h;
      }
    },
    [keyboardHeight]
  );

  // Track scroll position throttled
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = e.nativeEvent.contentOffset.y;
    },
    []
  );

  // Register a field's position & height inside the ScrollView
  const registerFieldLayout = useCallback(
    (fieldId: string, y: number, height: number = 50) => {
      fieldLayoutsRef.current[fieldId] = { y, height };
    },
    []
  );

  // Internal calculation to perform smooth, proportional scroll
  const performScroll = useCallback(
    (layout: FieldLayout, extraBottomMargin?: number) => {
      const fieldTop = layout.y;
      const fieldHeight = layout.height > 0 ? layout.height : 50;
      const fieldBottom = fieldTop + fieldHeight;
      const currentScrollY = scrollYRef.current;
      const effectiveBottomMargin = extraBottomMargin ?? bottomMargin;

      const containerH = containerHeightRef.current || Dimensions.get('window').height * 0.7;
      const baseH = unconstrainedHeightRef.current || containerH;
      const containerDidShrink = keyboardHeight > 0 && containerH < baseH - 100;
      const visibleHeight = containerDidShrink
        ? containerH
        : Math.max(160, containerH - (keyboardHeight > 0 ? keyboardHeight : 0));

      const screenTop = fieldTop - currentScrollY;
      const screenBottom = fieldBottom - currentScrollY;

      // 1. If already fully and comfortably visible in the viewport, do NOT scroll!
      if (screenTop >= topMargin && screenBottom <= visibleHeight - effectiveBottomMargin) {
        return;
      }

      // 2. If below visible viewport or partially behind keyboard:
      if (screenBottom > visibleHeight - effectiveBottomMargin) {
        if (fieldHeight > visibleHeight - topMargin - effectiveBottomMargin) {
          // Extra tall field (e.g. multiline textarea): align top
          const targetY = Math.max(0, fieldTop - topMargin);
          scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
        } else {
          // Normal field: align bottom gracefully right above the keyboard with effectiveBottomMargin
          const targetY = Math.max(0, fieldBottom + effectiveBottomMargin - visibleHeight);
          scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
        }
        return;
      }

      // 3. If above visible viewport:
      if (screenTop < topMargin) {
        const targetY = Math.max(0, fieldTop - topMargin);
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      }
    },
    [keyboardHeight, topMargin, bottomMargin]
  );

  // Scroll a specific field into view
  const scrollToField = useCallback(
    (fieldId: string, customBottomMargin?: number) => {
      activeFieldRef.current = fieldId;

      setTimeout(() => {
        const layout = fieldLayoutsRef.current[fieldId];
        if (!layout || typeof layout.y !== 'number') {
          // Field may be mounting; retry after short interval
          setTimeout(() => {
            const retry1 = fieldLayoutsRef.current[fieldId];
            if (retry1 && typeof retry1.y === 'number') {
              performScroll(retry1, customBottomMargin);
            } else {
              setTimeout(() => {
                const retry2 = fieldLayoutsRef.current[fieldId];
                if (retry2 && typeof retry2.y === 'number') {
                  performScroll(retry2, customBottomMargin);
                }
              }, 100);
            }
          }, 80);
          return;
        }

        performScroll(layout, customBottomMargin);
      }, 70);
    },
    [performScroll]
  );

  // Focus handler for inputs
  const handleInputFocus = useCallback(
    (fieldId: string, customBottomMargin?: number) => {
      activeFieldRef.current = fieldId;
      scrollToField(fieldId, customBottomMargin);
    },
    [scrollToField]
  );

  // Keyboard show/hide listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      setKeyboardHeight(height);
      if (activeFieldRef.current) {
        scrollToField(activeFieldRef.current);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      activeFieldRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToField]);

  // Compute clean, minimal paddingBottom
  const containerDidShrink =
    keyboardHeight > 0 &&
    containerHeightRef.current > 0 &&
    unconstrainedHeightRef.current > 0 &&
    containerHeightRef.current < unconstrainedHeightRef.current - 100;

  const contentPaddingBottom =
    keyboardHeight === 0
      ? defaultPaddingBottom
      : containerDidShrink
      ? defaultPaddingBottom
      : keyboardHeight + bottomMargin;

  return {
    scrollViewRef,
    keyboardHeight,
    contentPaddingBottom,
    handleScrollLayout,
    handleScroll,
    registerFieldLayout,
    scrollToField,
    handleInputFocus,
    activeFieldId: activeFieldRef.current,
  };
}
