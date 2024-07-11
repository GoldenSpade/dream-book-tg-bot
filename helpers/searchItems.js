// Функция поиска слова
export const searchItems = (searchData, searchTarget) => {
  return searchData.filter(el => el.word.toLowerCase().includes(searchTarget.toLowerCase()))
}