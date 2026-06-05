'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { textRevealContainer, textRevealChild } from '@/lib/marketing/animations';

interface TextRevealProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export function TextReveal({ text, className = '', as: Tag = 'span' }: TextRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const words = text.split(' ');

  return (
    <Tag ref={ref as never} className={className}>
      <motion.span
        variants={textRevealContainer}
        initial="initial"
        animate={isInView ? 'animate' : 'initial'}
        aria-label={text}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            variants={textRevealChild}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
}
