import { render, screen } from '@testing-library/react';
import App from './App';

test('渲染开场标题', () => {
  render(<App />);
  expect(screen.getByText(/星星大作战/i)).toBeInTheDocument();
});