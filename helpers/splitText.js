// Функция для разбиения текста на части по максимальной длине
export const splitText = (text, maxLength) => {
  const parts = []
  while (text.length > maxLength) {
    let part = text.substring(0, maxLength)
    const lastSpace = part.lastIndexOf('\n')
    if (lastSpace !== -1) {
      part = part.substring(0, lastSpace)
    }
    parts.push(part)
    text = text.substring(part.length)
  }
  parts.push(text)
  return parts
}