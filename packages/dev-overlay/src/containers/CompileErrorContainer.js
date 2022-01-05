import CompileError from '../components/CompileError';
import './CompileErrorContainer.scss';

const CompileErrorContainer = ({ errors }) => (
    <section className='compile-errors'>
        <header>Failed to Compile</header>
        <div className='error-container'>
            {errors.map((error) => (
                <CompileError level='error' {...error}/>
            ))}
        </div>
    </section>
);

export default CompileErrorContainer;