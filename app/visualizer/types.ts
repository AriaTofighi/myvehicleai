export type ModRow = {
  id: string
  user_id: string
  name: string
  prompt: string
  image_path: string
  width: number | null
  height: number | null
  created_at: string
  signedUrl?: string | null
}

export type ModAssetRow = {
  id: string
  user_id: string
  category: string
  name: string
  prompt: string
  image_path: string
  width: number | null
  height: number | null
  created_at: string
  signedUrl?: string | null
}

export type OverlayItem = {
  id: string // unique client id
  assetId: string
  url: string
  x: number // 0..1 relative to canvas width
  y: number // 0..1 relative to canvas height
  scale: number // 0.1..3
  rotation: number // degrees
  z: number
}

