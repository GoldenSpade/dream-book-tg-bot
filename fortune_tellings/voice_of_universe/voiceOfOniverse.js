import path from 'path'
import { fileURLToPath } from 'url'
import { cosmicFortunes } from './cosmicFortunes.js'

// Для корректного формирования путей
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Возвращает случайное предсказание и путь к видео
 * @returns {{ path: string, message: string, videoName: string }}
 */
export function getRandomCosmicFortune() {
  // Случайный объект иконки
  const randomIcon =
    cosmicFortunes[Math.floor(Math.random() * cosmicFortunes.length)]

  // Случайное трактование из выбранной иконки
  const randomMeaning =
    randomIcon.meanings[Math.floor(Math.random() * randomIcon.meanings.length)]

  // Путь к видеофайлу
  const videoFileName = `${randomIcon.image}.mp4`
  const videoPath = path.join(__dirname, 'videos', videoFileName)

  return {
    path: videoPath,
    message: randomMeaning,
    videoName: videoFileName,
    name: randomIcon.name,
  }
}
