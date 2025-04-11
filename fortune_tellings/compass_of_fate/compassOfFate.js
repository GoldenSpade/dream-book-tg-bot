import fs from 'fs'

function getCompassFateVideo() {
  const folderPath = './fortune_tellings/compass_of_fate/img'
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith('.mp4'))

  if (files.length === 0) {
    throw new Error('Нет доступных видео для компаса судьбы.')
  }

  const randomIndex = Math.floor(Math.random() * files.length)
  const filename = files[randomIndex]

  return {
    path: `${folderPath}/${filename}`,
    index: Number(filename.split('.')[0]) || randomIndex + 1,
  }
}

export { getCompassFateVideo }
