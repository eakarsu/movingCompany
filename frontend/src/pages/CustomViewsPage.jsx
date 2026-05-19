import 'leaflet/dist/leaflet.css';
import RouteMap from '../components/RouteMap';
import TruckCapacityGauge from '../components/TruckCapacityGauge';
import EstimatePDF from '../components/EstimatePDF';
import PackingChecklist from '../components/PackingChecklist';

export default function CustomViewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Moving Views</h1>
        <p className="text-sm text-gray-600">
          Operational visualizations and tools for residential moves: live route map,
          truck capacity gauges, estimate PDFs, and a packing-checklist wizard.
        </p>
      </div>

      <section>
        <RouteMap />
      </section>

      <section>
        <TruckCapacityGauge />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EstimatePDF />
        <PackingChecklist />
      </div>
    </div>
  );
}
