import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { Canvas } from './StyledMonitor'
import { Row, Label } from '../styles'
import { range } from '../../utils'
import { useCanvas2d, useThemeValue } from '../../hooks'
import { MonitorInput } from '../../types'

type MonitorProps = { valueKey: string } & Omit<MonitorInput, 'type'>
type ObjectProps = { initialValue: any }

const POINTS = 100

function push(arr: any[], val: any) {
  arr.push(val)
  if (arr.length > POINTS) arr.shift()
}

const MonitorCanvas = forwardRef(function({ initialValue }: ObjectProps, ref) {
  const accentColor = useThemeValue('color', 'accent')
  const points = useRef([initialValue])
  const min = useRef(initialValue)
  const max = useRef(initialValue)

  const drawPlot = useCallback(
    (_canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D) => {
      const { width, height } = _canvas
      _ctx.clearRect(0, 0, width, height)
      _ctx.beginPath()
      const interval = width / POINTS
      for (let i = 0; i < points.current.length; i++) {
        const p = range(points.current[i], min.current!, max.current!)
        _ctx.lineTo(interval * i, p * height * 0.9)
      }
      _ctx.strokeStyle = accentColor
      _ctx.stroke()
    },
    [accentColor]
  )

  const [canvas, ctx] = useCanvas2d(drawPlot)

  useImperativeHandle(
    ref,
    () => ({
      frame: (val: any) => {
        if (min.current === undefined || val < min.current) min.current = val
        if (max.current === undefined || val > max.current) max.current = val
        push(points.current, val)
        requestAnimationFrame(() => drawPlot(canvas.current!, ctx.current!))
      },
    }),
    [canvas, ctx, drawPlot]
  )

  return <Canvas ref={canvas} />
})

const parse = (val: any) => (Number.isFinite(val) ? val.toPrecision(2) : val.toString())

const MonitorLog = forwardRef(function({ initialValue }: ObjectProps, ref) {
  const [val, set] = useState(parse(initialValue))
  useImperativeHandle(ref, () => ({ frame: (v: any) => set(parse(v)) }), [])
  return <div>{val}</div>
})

function getValue(o: React.MutableRefObject<any> | Function) {
  return typeof o === 'function' ? o() : o.current
}

export function Monitor({ valueKey, objectOrFn, settings }: MonitorProps) {
  const ref = useRef<any>()
  const initialValue = useRef(getValue(objectOrFn))

  useEffect(() => {
    const timeout = setInterval(() => ref.current.frame(getValue(objectOrFn)), settings.interval)
    return () => clearInterval(timeout)
  }, [objectOrFn, settings.interval])

  return (
    <Row input>
      <Label>{valueKey}</Label>
      {settings.graph ? (
        <MonitorCanvas ref={ref} initialValue={initialValue.current} />
      ) : (
        <MonitorLog ref={ref} initialValue={initialValue.current} />
      )}
    </Row>
  )
}