import { useState } from "react"
import CountUpRaw from "react-countup"

const CountUp = typeof CountUpRaw === "function" ? CountUpRaw : (CountUpRaw as unknown as { default: typeof CountUpRaw }).default

interface AnimatedNumberProps {
  value: number | string | undefined | null
  decimals?: number
  prefix?: string
  suffix?: string
  isCurrency?: boolean
  isPreciseCurrency?: boolean
  isPercent?: boolean
  className?: string
  animateOnMount?: boolean
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  isCurrency = false,
  isPreciseCurrency = false,
  isPercent = false,
  className,
  animateOnMount = false,
}: AnimatedNumberProps) {
  const numericValue =
    value === undefined || value === null
      ? 0
      : typeof value === "string"
        ? parseFloat(value)
        : value

  const finalValue = isNaN(numericValue) ? 0 : numericValue

  const [prevValue, setPrevValue] = useState(animateOnMount ? 0 : finalValue)
  const [currValue, setCurrValue] = useState(finalValue)

  if (finalValue !== currValue) {
    setPrevValue(currValue)
    setCurrValue(finalValue)
  }

  let finalPrefix = prefix
  let finalSuffix = suffix
  let finalDecimals = decimals

  if (isCurrency) {
    finalPrefix = "S/ "
    finalDecimals = 2
  } else if (isPreciseCurrency) {
    finalDecimals = 2
  } else if (isPercent) {
    finalSuffix = "%"
    finalDecimals = 1
  }

  return (
    <CountUp
      key={`${prevValue}-${currValue}`}
      start={prevValue}
      end={currValue}
      duration={1.0}
      decimals={finalDecimals}
      decimal="."
      separator=","
      prefix={finalPrefix}
      suffix={finalSuffix}
      className={className}
    />
  )
}
