import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';
import { WEB_URL, isAllowedUrl, makeLoginScript } from './src/login';

type Credentials = { email: string; password: string };
const KEY = 'harodoor.credentials.v1';
export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [booting, setBooting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Conectando con Harodoor…');
  const [loading, setLoading] = useState(true);
  const [webError, setWebError] = useState(false);
  const [instance, setInstance] = useState(0);
  const web = useRef<WebView>(null);
  const attempted = useRef(false);
  const canGoBack = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(KEY);
        if (stored) {
          const value = JSON.parse(stored);
          if (typeof value.email === 'string' && typeof value.password === 'string') setCredentials(value);
        }
      } catch { setError('No se pudo leer el acceso guardado. Puedes volver a guardarlo.'); }
      finally { setBooting(false); }
    })();
  }, []);
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (credentials && canGoBack.current) { web.current?.goBack(); return true; }
      return false;
    });
    return () => handler.remove();
  }, [credentials]);

  const save = async () => {
    if (!email.trim() || !password) { setError('Escribe tu usuario y contraseña.'); return; }
    setSaving(true); setError('');
    try {
      const value = { email: email.trim(), password };
      await SecureStore.setItemAsync(KEY, JSON.stringify(value), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
      attempted.current = false;
      setCredentials(value); setPassword(''); setHint('Conectando con Harodoor…'); setWebError(false);
    } catch { setError('No se pudo guardar el acceso de forma segura. Inténtalo de nuevo.'); }
    finally { setSaving(false); }
  };
  const forget = () => Alert.alert('Borrar acceso', 'Se eliminarán las credenciales guardadas en este teléfono.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Borrar', style: 'destructive', onPress: async () => {
      try {
        await SecureStore.deleteItemAsync(KEY);
        setCredentials(null); setEmail(''); setPassword(''); setError(''); setInstance(v => v + 1);
      } catch { Alert.alert('No se pudo borrar', 'Vuelve a intentarlo.'); }
    } },
  ]);
  if (booting) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#126a61" /></SafeAreaView>;
  return <SafeAreaView style={styles.screen}>
    <StatusBar style="dark" />
    <View style={styles.header}><Text style={styles.title}>Cerrada del Marqués</Text><Text style={styles.subtitle}>Tu acceso, a la mano</Text></View>
    {!credentials ? <KeyboardAvoidingView style={styles.form} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.heading}>Bienvenido a casa</Text>
      <Text style={styles.description}>Guarda tu cuenta de Harodoor una vez para entrar desde esta app.</Text>
      <Text style={styles.label}>Usuario o correo</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="username" accessibilityLabel="Usuario o correo" />
      <Text style={styles.label}>Contraseña</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="password" accessibilityLabel="Contraseña" onSubmitEditing={save} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <TouchableOpacity disabled={saving} style={styles.primary} onPress={save}><Text style={styles.primaryText}>{saving ? 'Guardando…' : 'Guardar y entrar'}</Text></TouchableOpacity>
      <Text style={styles.privacy}>Las credenciales se guardan cifradas en este teléfono. Usa tu propia cuenta; no necesitas compartir tu contraseña con los vecinos.</Text>
    </KeyboardAvoidingView> : <View style={styles.content}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => { setWebError(false); web.current?.reload(); }}><Text style={styles.link}>Recargar</Text></TouchableOpacity>
        <TouchableOpacity onPress={forget}><Text style={styles.link}>Borrar acceso</Text></TouchableOpacity>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.hint}>{webError ? 'No se pudo conectar. Revisa tu conexión y pulsa Recargar.' : hint}</Text>
      {loading && <ActivityIndicator color="#126a61" />}
      <WebView key={instance} ref={web} source={{ uri: WEB_URL }} style={styles.web}
        incognito sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false}
        originWhitelist={['https://delmarques.harodoor.app']} mixedContentMode="never"
        allowFileAccess={false} javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows
        onShouldStartLoadWithRequest={request => isAllowedUrl(request.url)}
        onOpenWindow={() => Alert.alert('Enlace externo', 'Por seguridad, esta app solo abre la página de tu cerrada.')}
        onNavigationStateChange={state => { canGoBack.current = state.canGoBack; }}
        onLoadStart={() => { setLoading(true); }}
        onLoadEnd={event => {
          setLoading(false);
          if (!isAllowedUrl(event.nativeEvent.url)) return;
          setHint('Harodoor · La apertura del portón se realiza desde la página.');
          web.current?.injectJavaScript(makeLoginScript(credentials.email, credentials.password, !attempted.current));
        }}
        onError={() => { setLoading(false); setWebError(true); }}
        onHttpError={event => { if (event.nativeEvent.statusCode >= 400) { setLoading(false); setWebError(true); } }}
        onMessage={event => {
          if (!isAllowedUrl(event.nativeEvent.url)) return;
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'submitted') { attempted.current = true; setHint('Enviando inicio de sesión…'); }
            if (message.type === 'manual' || (message.type === 'filled' && attempted.current)) {
              setHint('Revisa el formulario. Si no ingresaste, confirma tus datos o pulsa Ingresar en la página.');
            }
          } catch { /* Ignore unrelated page messages. */ }
        }}
      />
    </View>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f6f4', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 22, backgroundColor: '#e1eeE7' }, title: { fontSize: 23, fontWeight: '700', color: '#164b43' },
  subtitle: { marginTop: 4, color: '#47655d' }, form: { flex: 1, padding: 24, justifyContent: 'center' },
  heading: { fontSize: 27, fontWeight: '700', color: '#163c34', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24, color: '#52645e', marginBottom: 24 },
  label: { color: '#234b41', marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#b6cbc1', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 18 },
  primary: { padding: 17, borderRadius: 12, backgroundColor: '#126a61', alignItems: 'center', marginTop: 4 },
  primaryText: { fontSize: 16, fontWeight: '700', color: 'white' },
  privacy: { fontSize: 13, lineHeight: 20, color: '#60736b', marginTop: 20 },
  error: { color: '#a52a2a', marginBottom: 12 }, content: { flex: 1 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  link: { color: '#126a61', fontWeight: '600', padding: 5 }, hint: { paddingHorizontal: 18, paddingBottom: 12, color: '#52645e', fontSize: 12 },
  web: { flex: 1, backgroundColor: 'white' },
});
