import { describe, expect, it } from 'vitest';
import { alignsWithQuestions, attemptCorrectness, parseAnswers, parseOptions } from './scoring';

describe('parseAnswers', () => {
  it('читає масив індексів', () => {
    expect(parseAnswers('[0,2,1]')).toEqual([0, 2, 1]);
  });

  it('не падає на зіпсованому JSON і на чужій формі даних', () => {
    expect(parseAnswers('не json')).toEqual([]);
    expect(parseAnswers('{"a":1}')).toEqual([]);
  });

  it('нечислові відповіді стають «не відповів», а не дірками в масиві', () => {
    expect(parseAnswers('[1,null,"2"]')).toEqual([1, -1, -1]);
  });
});

describe('parseOptions', () => {
  it('читає варіанти відповіді', () => {
    expect(parseOptions('["так","ні"]')).toEqual(['так', 'ні']);
  });

  it('на зіпсованому JSON віддає порожній список', () => {
    expect(parseOptions('[[[')).toEqual([]);
  });
});

describe('attemptCorrectness', () => {
  it('відновлює число правильних із балу й довжини відповідей', () => {
    expect(attemptCorrectness(90, '[0,0,0,0,0,0,0,0,0,0]')).toEqual({ correct: 9, total: 10 });
    expect(attemptCorrectness(92, '[0,0,0,0,0,0,0,0,0,0,0,0]')).toEqual({ correct: 11, total: 12 });
    expect(attemptCorrectness(100, '[1,1,1]')).toEqual({ correct: 3, total: 3 });
    expect(attemptCorrectness(0, '[1,1,1]')).toEqual({ correct: 0, total: 3 });
  });

  it('спроба без відповідей нічого не додає до знаменника', () => {
    expect(attemptCorrectness(80, 'зіпсовано')).toEqual({ correct: 0, total: 0 });
  });
});

describe('alignsWithQuestions', () => {
  const questions = [{ correctIndex: 0 }, { correctIndex: 1 }, { correctIndex: 2 }, { correctIndex: 3 }];

  it('спроба по цьому ж тесту розкладається по питаннях', () => {
    // Три з чотирьох правильно → 75%.
    expect(alignsWithQuestions([0, 1, 2, 0], questions, 75)).toBe(true);
  });

  it('повністю правильна спроба теж розкладається', () => {
    expect(alignsWithQuestions([0, 1, 2, 3], questions, 100)).toBe(true);
  });

  it('спроба по переписаному тесту відсіюється, хоч кількість питань і збіглась', () => {
    // Бал каже «три з чотирьох», а зіставлення з нинішніми питаннями дає нуль:
    // це відповіді на інші питання.
    expect(alignsWithQuestions([3, 3, 3, 0], questions, 75)).toBe(false);
  });

  it('інша кількість питань — не розкладається', () => {
    expect(alignsWithQuestions([0, 1], questions, 100)).toBe(false);
  });

  it('тест без питань — не розкладається', () => {
    expect(alignsWithQuestions([], [], 100)).toBe(false);
  });
});
