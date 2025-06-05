import Navbar from './components/Navbar';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import styles from './styles/pagesDesign/Home.module.css';
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
          <InfoCard title="Missions completed: 9"
            lines={[
              "This Shows the amout",
              "of missions completed,",
              "since the start of the year."
            ]}
          />
          <InfoCard title="Missions active: 2"
            lines={[
              "This Shows the amout",
              "of missions active,",
              "and currently using TactiGrid."
            ]}
          />
          <InfoCard title="Mission successions Rate: 87%"
            lines={[
              "This Shows the successions",
              "rate of missions,",
              "since the start of the year."
            ]}
          />

        </div>

        <div className={styles.carouselWrapper}>
          {/* <CardView></CardView> */}
          

        </div>
      </main>
    </div>
  );
}


