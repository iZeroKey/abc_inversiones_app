"use client";

import { useCallback, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export function useDrawerQueryParam(paramName: string) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Track whether the current history entry was pushed by us.
  // If we pushed it, navigate(-1) is safe to undo it.
  // If not (e.g. user landed here directly), we fall back to REPLACE.
  const pushedByUs = useRef(false);

  const value = searchParams.get(paramName);
  const isOpen = value !== null;

  const open = useCallback(
    (newValue: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(paramName, newValue);

      const search = `?${next.toString()}`;

      if (isOpen) {
        // Already open with a (possibly different) value → REPLACE to avoid
        // stacking multiple history entries for the same drawer.
        navigate(`${location.pathname}${search}`, { replace: true });
        // pushedByUs stays whatever it was before the first open.
      } else {
        // First open → PUSH so the back button can close it.
        navigate(`${location.pathname}${search}`);
        pushedByUs.current = true;
      }
    },
    [searchParams, paramName, isOpen, navigate, location.pathname],
  );

  const close = useCallback(() => {
    if (pushedByUs.current) {
      // We pushed this entry, so going back removes the param naturally.
      pushedByUs.current = false;
      navigate(-1);
    } else {
      // We didn't push (user navigated here directly, or edge case where
      // the previous history entry also had this param). Remove the param
      // via REPLACE so we don't break the history stack.
      const next = new URLSearchParams(searchParams);
      next.delete(paramName);
      const qs = next.toString();
      const search = qs ? `?${qs}` : "";
      navigate(`${location.pathname}${search}`, { replace: true });
    }
  }, [navigate, searchParams, paramName, location.pathname]);

  return { value, isOpen, open, close } as const;
}
