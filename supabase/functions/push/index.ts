// Edge Function for sending push notifications via Expo Push Service
// Triggered by webhook on user_notifications INSERT

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    user_id: string;
    title: string;  // fallback title from trigger
    body: string;   // fallback body from trigger
    data: Record<string, any>;  // may include notification_type and variables
  };
  schema: string;
}

interface DeviceToken {
  expo_push_token: string;
  device_type?: string;
}

interface ExpoPushMessage {
  to: string;
  sound?: 'default';
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
  // Rich content support for images (e.g., celebrant avatar)
  richContent?: {
    image?: string;
  };
}

interface ExpoPushResponse {
  data: Array<{
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: any;
  }>;
}

interface NotificationTemplate {
  title_template: string;
  body_template: string;
}

// Get user's preferred language, fallback to 'en'
async function getUserLanguage(
  supabase: any,
  userId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('preferred_language')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Failed to fetch user language:', error);
      return 'en';
    }

    return data?.preferred_language || 'en';
  } catch (error) {
    console.warn('Error fetching user language:', error);
    return 'en';
  }
}

// Get localized notification template with fallback to English
async function getLocalizedNotification(
  supabase: any,
  notificationType: string,
  languageCode: string,
  variables: Record<string, string>
): Promise<{ title: string; body: string } | null> {
  // Try user's preferred language first
  const { data: template, error } = await supabase
    .from('notification_translations')
    .select('title_template, body_template')
    .eq('notification_type', notificationType)
    .eq('language_code', languageCode)
    .single();

  let finalTemplate: NotificationTemplate | null = template;

  // Fallback to English if preferred language template not found
  if (error || !template) {
    if (languageCode !== 'en') {
      console.log(`Template not found for ${notificationType}/${languageCode}, falling back to English`);
      const { data: fallback } = await supabase
        .from('notification_translations')
        .select('title_template, body_template')
        .eq('notification_type', notificationType)
        .eq('language_code', 'en')
        .single();
      finalTemplate = fallback;
    }
  }

  if (!finalTemplate) {
    console.warn(`No template found for notification type: ${notificationType}`);
    return null;
  }

  // Apply variable interpolation
  let title = finalTemplate.title_template;
  let body = finalTemplate.body_template;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    title = title.replace(pattern, value);
    body = body.replace(pattern, value);
  }

  return { title, body };
}

serve(async (req) => {
  // CORS headers for webhook calls
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse webhook payload
    const payload: NotificationPayload = await req.json();

    console.log('Received notification payload:', payload);

    // Verify it's an INSERT on user_notifications
    if (payload.type !== 'INSERT' || payload.table !== 'user_notifications') {
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, title, body, data } = payload.record;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we should use localized templates
    let finalTitle = title;
    let finalBody = body;

    const notificationType = data?.notification_type as string | undefined;
    if (notificationType) {
      // Get user's language preference
      const userLanguage = await getUserLanguage(supabase, user_id);
      console.log(`User ${user_id} language preference: ${userLanguage}`);

      // Build variables object from data
      const variables: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (key !== 'notification_type' && key !== 'avatar_url' && typeof value === 'string') {
          variables[key] = value;
        }
      }

      // Get localized notification
      const localized = await getLocalizedNotification(
        supabase,
        notificationType,
        userLanguage,
        variables
      );

      if (localized) {
        finalTitle = localized.title;
        finalBody = localized.body;
        console.log(`Using localized template for ${notificationType} in ${userLanguage}`);
      } else {
        console.log(`Using fallback title/body for ${notificationType}`);
      }
    }

    // Query device tokens for the user
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('expo_push_token, device_type')
      .eq('user_id', user_id);

    if (tokensError) {
      console.error('Error fetching device tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch device tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No device tokens found for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'No device tokens found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log warning if avatar_url is HTTP (should be HTTPS for Expo Push)
    if (data?.avatar_url && !data.avatar_url.startsWith('https://')) {
      console.warn('avatar_url is not HTTPS, image may not display:', data.avatar_url);
    }

    // Prepare push messages for all user devices
    const messages: ExpoPushMessage[] = tokens.map((token: DeviceToken) => ({
      to: token.expo_push_token,
      sound: 'default',
      title: finalTitle,
      body: finalBody,
      data: data || {},
      // Use the Android notification channel we created
      channelId: 'default',
      // Conditionally add rich content for avatar image
      ...(data?.avatar_url && {
        richContent: {
          image: data.avatar_url
        }
      })
    }));

    console.log('Sending push notifications to:', messages.length, 'devices');

    // Send push notifications to Expo Push Service
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result: ExpoPushResponse = await response.json();

    console.log('Expo push response:', result);

    // Log any errors from Expo
    if (result.data) {
      result.data.forEach((item, index) => {
        if (item.status === 'error') {
          console.error(`Push error for device ${index}:`, item.message, item.details);
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: messages.length,
        results: result.data
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
