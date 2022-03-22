import CompileError from '../components/CompileError';
import './CompileErrorContainer.scss';

const CompileErrorContainer = ({ errors, highlighter }) => (
    <section className='compile-errors'>
        <header>Failed to Compile</header>
        <div className='error-container'>
            {errors.map((error) => {
                const source = (error.type === 'tsc' && error.location) ? highlighter.get(error.file) : null;
                return (
                    <CompileError
                        level='error'
                        source={source}
                        {...error}
                    />
                );
            })}
        </div>
    </section>
);

export default CompileErrorContainer;