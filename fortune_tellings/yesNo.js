import { promises as fs } from 'fs'
import path from 'path'

const gifFiles = [
  'yes.gif',
  'no.gif',
  'almost.gif',
  'soon.gif',
  'maybe.gif',
  '50x50.gif',
]

export async function getRandomFortuneGif() {
  const randomGif = gifFiles[Math.floor(Math.random() * gifFiles.length)]
  const imagePath = path.join(
    process.cwd(),
    'fortune_tellings',
    'yes_no',
    'img',
    randomGif
  )
  return await fs.readFile(imagePath)
}
