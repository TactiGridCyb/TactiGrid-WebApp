// components/NextArrow.js
"use client";
import React from 'react';
import styles from '../styles/componentsDesign/arrow.module.css';

const NextArrow = (props) => {
  const { onClick } = props;
  return (
    <div className={`${styles.slickarrow} ${styles.slicknext}`} onClick={onClick}>
    ›
  </div>
  );
};

export default NextArrow;
