import { useRef, useState, useEffect } from 'react'
import { cn } from '../lib/utils'

export default function SignatureCanvas({ onSign, onClear, label = 'Sign here', disabled = false }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [lastPos, setLastPos] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#050D1F'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e) => {
    if (disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    const pos = getPos(e, canvas)
    setDrawing(true)
    setLastPos(pos)
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e) => {
    if (!drawing || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setLastPos(pos)
    setHasSignature(true)
  }

  const endDraw = (e) => {
    if (!drawing) return
    e.preventDefault()
    setDrawing(false)
    if (hasSignature) {
      const dataUrl = canvasRef.current.toDataURL('image/png')
      onSign?.(dataUrl)
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onClear?.()
  }

  return (
    <div className="space-y-2">
      <div className={cn('relative border-2 rounded-xl overflow-hidden bg-white transition-colors', drawing ? 'border-brand' : 'border-gray-300', disabled && 'opacity-50 pointer-events-none')}>
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full h-32 cursor-crosshair touch-none block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm select-none">{label}</p>
          </div>
        )}
        {/* Signature baseline */}
        <div className="absolute bottom-6 left-6 right-6 border-b border-gray-200 pointer-events-none" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Draw your signature above</p>
        {hasSignature && (
          <button onClick={clear} className="text-xs text-red-500 font-medium">Clear</button>
        )}
      </div>
    </div>
  )
}
