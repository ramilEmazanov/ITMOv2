import { useEffect, useRef, useState, type FormEvent } from 'react'

const cities = [
  { code: 'MOW', name: 'Москва' },
  { code: 'LED', name: 'Санкт-Петербург' },
  { code: 'KZN', name: 'Казань' },
  { code: 'AER', name: 'Сочи' },
  { code: 'IST', name: 'Стамбул' },
  { code: 'DXB', name: 'Дубай' },
] as const

type CityCode = (typeof cities)[number]['code']
type TransferMode = 'any' | 'direct' | 'with_transfer'
type Search = {
  origin: CityCode
  destination: CityCode
  transfers: TransferMode
}

const transferOptions: { value: TransferMode; label: string }[] = [
  { value: 'any', label: 'Любые рейсы' },
  { value: 'direct', label: 'Без пересадок' },
  { value: 'with_transfer', label: 'С пересадками' },
]

function cityName(code: CityCode) {
  return cities.find((city) => city.code === code)?.name ?? code
}

function App() {
  const [origin, setOrigin] = useState<CityCode>('MOW')
  const [destination, setDestination] = useState<CityCode>('LED')
  const [transfers, setTransfers] = useState<TransferMode>('any')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState<Search | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSearch(null)

    if (origin === destination) {
      setError('Город отправления и город назначения должны отличаться.')
      return
    }

    setIsLoading(true)
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => {
      setSearch({ origin, destination, transfers })
      setIsLoading(false)
      timeoutRef.current = null
    }, 650)
  }

  const demoFlights = search
    ? [
        { label: 'Прямой рейс', stops: 0, price: 4300, color: 'blue' },
        { label: '1 пересадка', stops: 1, price: 3650, color: 'red' },
        { label: '2 пересадки', stops: 2, price: 3190, color: 'yellow' },
      ]
        .filter((flight) =>
          search.transfers === 'direct'
            ? flight.stops === 0
            : search.transfers === 'with_transfer'
              ? flight.stops > 0
              : true,
        )
        .sort((a, b) => a.price - b.price)
    : []

  return (
    <div className="page">
      <header className="topbar">
        <span className="topbar-brand">Билетик</span>
        <span className="topbar-active">Поиск</span>
        <span className="topbar-muted">Авиабилеты</span>
        <span className="topbar-right">Демо проекта</span>
      </header>

      <main className="main">
        <div className="logo" aria-label="Билетик">
          <span className="logo-blue">Б</span>
          <span className="logo-red">и</span>
          <span className="logo-yellow">л</span>
          <span className="logo-blue">е</span>
          <span className="logo-green">т</span>
          <span className="logo-red">и</span>
          <span className="logo-blue">к</span>
        </div>
        <p className="tagline">Найдите билет по приятной цене</p>

        <form className="search-form" onSubmit={handleSubmit}>
          <div className="route-fields">
            <label className="field">
              <span>Откуда</span>
              <select value={origin} onChange={(event) => setOrigin(event.target.value as CityCode)}>
                {cities.map((city) => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <span className="route-arrow" aria-hidden="true">→</span>

            <label className="field">
              <span>Куда</span>
              <select value={destination} onChange={(event) => setDestination(event.target.value as CityCode)}>
                {cities.map((city) => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="transfer-options">
            <legend>Пересадки</legend>
            {transferOptions.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="transfers"
                  value={option.value}
                  checked={transfers === option.value}
                  onChange={() => setTransfers(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          <button className="search-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Ищем билеты…' : 'Найти билеты'}
          </button>
        </form>

        <div className="feedback" aria-live="polite">
          {error && <p className="error">{error}</p>}
          {isLoading && <p>Проверяем варианты маршрута…</p>}
        </div>

        {search && (
          <section className="results" aria-label="Демонстрационные результаты поиска">
            <h1>{cityName(search.origin)} → {cityName(search.destination)}</h1>
            <p className="results-note">Пример работы интерфейса. Цены и рейсы вымышлены.</p>
            <div className="flights">
              {demoFlights.map((flight) => (
                <div className="flight" key={flight.stops}>
                  <span className={`flight-dot ${flight.color}`} aria-hidden="true" />
                  <span>{flight.label}</span>
                  <strong>от {flight.price.toLocaleString('ru-RU')} ₽</strong>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">Учебный проект · Поиск авиабилетов</footer>
    </div>
  )
}

export default App
