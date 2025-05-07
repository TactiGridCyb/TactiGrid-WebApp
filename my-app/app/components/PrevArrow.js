// components/PrevArrow.js
"use client";
import React from 'react';
import styles from '../styles/componentsDesign/arrow.module.css';

const PrevArrow = (props) => {
  const { onClick } = props;
  return (
    <div className={`${styles.slickarrow} ${styles.slickprev}`} onClick={onClick}>
    ‹
  </div>
  );
};

export default PrevArrow;
