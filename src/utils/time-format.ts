export const timeFormat = (time: Date) => {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
    return formatter.format(time)
}