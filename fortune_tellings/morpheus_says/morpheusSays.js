import { promises as fs } from 'fs'
import path from 'path'

// Путь к изображению
const IMAGE_PATH = path.join(
  process.cwd(),
  'fortune_tellings',
  'morpheus_says',
  'img',
  'morpheus.jpg'
)

async function getMorpheusImage() {
  return {
    path: IMAGE_PATH,
    filename: 'morpheus.jpg',
  }
}

// Получаем список реально существующих файлов
async function getAvailableAudioFiles() {
  const audioDir = path.join(
    process.cwd(),
    'fortune_tellings',
    'morpheus_says',
    'audio'
  )

  try {
    const files = await fs.readdir(audioDir)
    return files
      .filter((file) => file.startsWith('morpheus_') && file.endsWith('.ogg'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0])
        const numB = parseInt(b.match(/\d+/)[0])
        return numA - numB
      })
  } catch (error) {
    console.error('Ошибка чтения директории с аудио:', error)
    return []
  }
}

// Кэшируем список файлов
let availableAudioFiles = []

async function getRandomMorpheusAudio() {
  // Загружаем файлы при первом вызове
  if (availableAudioFiles.length === 0) {
    availableAudioFiles = await getAvailableAudioFiles()
    if (availableAudioFiles.length === 0) {
      throw new Error('Нет доступных аудиофайлов Морфея')
    }
    console.log(`Загружено ${availableAudioFiles.length} аудиофайлов Морфея`)
  }

  const randomFile =
    availableAudioFiles[Math.floor(Math.random() * availableAudioFiles.length)]
  const audioPath = path.join(
    process.cwd(),
    'fortune_tellings',
    'morpheus_says',
    'audio',
    randomFile
  )

  return {
    path: audioPath,
    filename: randomFile,
  }
}

export { getRandomMorpheusAudio, getMorpheusImage }
