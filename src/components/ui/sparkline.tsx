"use client"

type Props = {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
}

export default function Sparkline({ data, width = 120, height = 32, stroke = "currentColor", fill = "none" }: Props) {
  if (!data || data.length === 0) {
    return <svg width={width} height={height} />
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-70">
      <polyline
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}







