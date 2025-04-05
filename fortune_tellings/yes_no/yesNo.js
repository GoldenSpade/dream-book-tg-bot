import { promises as fs } from 'fs'
import path from 'path'

const jpgFiles = [
  'yes.mp4',
  'no.mp4',
  'almost.mp4',
  'soon.mp4',
  'maybe.mp4',
  '50x50.mp4',
]

async function getRandomFortune() {
  const randomjpg = jpgFiles[Math.floor(Math.random() * jpgFiles.length)]
  const imagePath = path.join(
    process.cwd(),
    'fortune_tellings',
    'yes_no',
    'img',
    randomjpg
  )
  return await fs.readFile(imagePath)
}

async function getMagicBallImage() {
  const imagePath = path.join(
    process.cwd(),
    'fortune_tellings',
    'yes_no',
    'img',
    'magic_ball.jpg'
  )
  return await fs.readFile(imagePath)
}

export { getRandomFortune, getMagicBallImage }
