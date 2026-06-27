"use client";

import { useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export function useDrawerQueryParam(paramName: string) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const value = searchParams.get(paramName);
  const isOpen = value !== null;

  const open = useCallback(
    (newValue: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(paramName, newValue);
      navigate(`${location.pathname}?${next.toString()}`, { replace: true });
    },
    [searchParams, paramName, navigate, location.pathname],
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(paramName);
    const qs = next.toString();
    const search = qs ? `?${qs}` : "";
    navigate(`${location.pathname}${search}`, { replace: true });
  }, [navigate, searchParams, paramName, location.pathname]);

  return { value, isOpen, open, close } as const;
}
