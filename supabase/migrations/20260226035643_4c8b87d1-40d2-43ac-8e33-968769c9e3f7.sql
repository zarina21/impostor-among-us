
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip profile creation for anonymous users (they create their own profile with chosen name)
  IF NEW.is_anonymous = true THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Jugador_' || LEFT(NEW.id::text, 8)));
  RETURN NEW;
END;
$function$;
