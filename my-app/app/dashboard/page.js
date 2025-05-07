import layout from '../styles/pagesDesign/Dashboard.module.css';
import Navbar from '../components/Navbar.js';
import StatsGrid from '../components/statistics/StatsGrid';
import SalesChart from '../components/statistics/SalesChart';
import RecentActivity from '../components/statistics/RecentActivity';

export default function DashboardPage() {
  return (
    <div>
      <Navbar />

      <header className={layout.header}>
        <h1>Dashboard</h1>
      </header>
    <main className={layout.dashboardRoot}>
      
    

      {/* four small cards */}
      <section className={layout.sectionGrid}>
        <StatsGrid />
      </section>

      {/* chart + activity */}
      <section className={layout.twoThirdOneThird}>
        <SalesChart />
        <RecentActivity />
      </section>
    </main>
    </div>
  );
}