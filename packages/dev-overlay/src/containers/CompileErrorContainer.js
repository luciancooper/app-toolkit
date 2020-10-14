import CompileError from '../components/CompileError';
import './CompileErrorContainer.scss';

export default function CompileErrorContainer({ errors }) {
    return (
        <section className='compile-errors'>
            <header>Failed to Compile</header>
            <div className='error-container'>
                {
                    errors.map((error) => (
                        <CompileError level='error' {...error}/>
                    ))
                }
            </div>
        </section>
    );
}