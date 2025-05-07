// components/GraphCarousel.js
"use client";
import React from 'react';
import Slider from 'react-slick';
import { Line } from 'react-chartjs-2';
import NextArrow from './NextArrow';
import PrevArrow from './PrevArrow';

// Import and register Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Sample chart data for demonstration:
const chartData1 = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [{
    label: 'Dataset 1',
    data: [10, 20, 30, 40, 50],
    borderColor: 'rgba(75,192,192,1)',
    fill: false,
  }]
};

const chartData2 = {
  labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  datasets: [{
    label: 'Dataset 2',
    data: [50, 40, 30, 20, 10],
    borderColor: 'rgba(255,99,132,1)',
    fill: false,
  }]
};

const chartData3 = {
  labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  datasets: [{
    label: 'Dataset 3',
    data: [20, 30, 40, 30, 20],
    borderColor: 'rgba(153,102,255,1)',
    fill: false,
  }]
};

const GraphCarousel = () => {
  // Configure slider settings using custom arrow components.
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    nextArrow: <PrevArrow />,
    prevArrow: <NextArrow />,
  };

  // Common style for each slide container
  const slideStyle = { height: '300px', position: 'relative' };

  return (
    
    <div className="graph-carousel" style={{ overflow: 'hidden', maxHeight: '320px' }}>
      <Slider {...settings}>
        <div>
          <div style={slideStyle}>
            <Line data={chartData1} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        <div>
          <div style={slideStyle}>
            <Line data={chartData2} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        <div>
          <div style={slideStyle}>
            <Line data={chartData3} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </Slider>
      
    </div>
    
  );
};

export default GraphCarousel;
