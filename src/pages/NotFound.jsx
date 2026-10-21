import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { EmptyState } from '../components/States'

export default function NotFound() {
  return (
    <div className="page">
      <section className="card">
        <EmptyState icon="alert" title="Page not found" message="The page you're looking for doesn't exist.">
          <Link className="btn btn-primary" to="/dashboard">
            <Icon name="dashboard" size={16} /> Go to dashboard
          </Link>
        </EmptyState>
      </section>
    </div>
  )
}
