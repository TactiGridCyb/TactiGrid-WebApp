import Navbar from './components/Navbar';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import styles from './styles/Home.module.css';
import CardView from './components/CardView';
import GraphCarousel from './components/GraphCarousel.js';
import InfoCard from './components/InfoCard.js'

export default function Home() {
  return (
    <div>
      <Navbar />

      <header className={styles.header}>
        <h1>TactiGrid</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.statsContainer}>
          <InfoCard title="Important Notice"
            lines={[
              "Your report is overdue.",
              "Please submit before Friday.",
              "Contact admin if needed."
            ]}
          />
          <InfoCard title="Important Notice"
            lines={[
              "Your report is overdue.",
              "Please submit before Friday.",
              "Contact admin if needed."
            ]}
          />
          <InfoCard title="Important Notice"
            lines={[
              "Your report is overdue.",
              "Please submit before Friday.",
              "Contact admin if needed."
            ]}
          />

        </div>

        <div className={styles.carouselWrapper}>
          {/* <CardView></CardView> */}
          <GraphCarousel />

        </div>
      </main>
    </div>
  );
}


