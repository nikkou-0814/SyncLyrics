import React from 'react';
import { loadDefaultJapaneseParser } from 'budoux';

const LineBreaker: React.FC<{ text: string }> = ({ text }) => {
  const parser = loadDefaultJapaneseParser();
  const html = parser.translateHTMLString(text);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

export default LineBreaker;