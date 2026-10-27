import { Redirect } from 'expo-router';

/** Old link: trophies and medals now live in the Trofei section of the hub. */
export default function Trofei() {
  return <Redirect href={{ pathname: '/', params: { tab: 'trofei' } }} />;
}
