import React from 'react';
import { loadDefaultJapaneseParser } from 'budoux';

const parser = loadDefaultJapaneseParser();

const LineBreaker: React.FC<{ text: string }> = ({ text }) => {
  return (
    <span style={{ wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
      {parser.parse(text).map((chunk, index) => (
        <React.Fragment key={index}>
          {index > 0 && <wbr />}
          {chunk}
        </React.Fragment>
      ))}
    </span>
  );
};

export default LineBreaker;
