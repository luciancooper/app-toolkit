import type { ErrorData } from '@lcooper/webpack-messages';
import type { SourceHighlighter } from '../../types';
import CompileError from '../components/CompileError';
import './CompileErrorContainer.scss';

interface Props {
    errors: ErrorData[]
    highlighter: SourceHighlighter
}

const CompileErrorContainer = ({ errors, highlighter }: Props) => (
    <section className='compile-errors'>
        <header>Failed to Compile</header>
        <div className='error-container'>
            {errors.map((error) => {
                const source = (error.type === 'tsc' && error.file && error.location)
                    ? highlighter.get(error.file) : null;
                return (
                    <CompileError
                        level='error'
                        error={error}
                        source={source}
                    />
                );
            })}
        </div>
    </section>
);

export default CompileErrorContainer;