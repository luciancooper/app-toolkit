import RuntimeError from '../components/RuntimeError';
import './RuntimeErrorContainer.scss';

export default function RuntimeErrorContainer({ errors }) {
    return (
        <section className='runtime-errors'>
            {errors.map((e) => <RuntimeError {...e}/>)}
        </section>
    );
}