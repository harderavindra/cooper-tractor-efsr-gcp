import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto mt-16 text-center">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">404</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Page not found.</p>
      <Link to="/" className="text-blue-600 hover:underline">Go home</Link>
    </div>
  )
}
