import { useCanvasDraw } from '../utils/useCanvasDraw'

export default function TCCCanvas({ state, sol, anc }) {
  const canvasRef = useCanvasDraw(state, sol, anc)
  return (
    <div className="canvas-wrapper">
      <canvas ref={canvasRef} />
    </div>
  )
}
