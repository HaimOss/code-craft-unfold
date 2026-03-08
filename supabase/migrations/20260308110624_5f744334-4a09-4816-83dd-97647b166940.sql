
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trip1_id uuid;
  trip2_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );

  -- Sample trip 1: Rome
  trip1_id := gen_random_uuid();
  INSERT INTO public.trips (id, user_id, name, destination, start_date, end_date, base_currency, status)
  VALUES (trip1_id, NEW.id, 'חופשה ברומא 🇮🇹', 'רומא, איטליה', '2026-05-10', '2026-05-14', 'EUR', 'Planning 📝');

  INSERT INTO public.events (trip_id, user_id, date, time, end_time, category, title, amount, currency, payment_method, details, notes, sort_order) VALUES
    (trip1_id, NEW.id, '2026-05-10', '06:00', '10:30', 'Flights ✈️', 'טיסה לרומא', 350, 'EUR', 'Credit', '{"dept_airport":"TLV","arr_airport":"FCO","flight_num":"AZ801"}', 'טיסה ישירה', 0),
    (trip1_id, NEW.id, '2026-05-10', '14:00', null, 'Accommodation 🏨', 'מלון ליד הקולוסיאום', 120, 'EUR', 'Credit', '{"address":"Via dei Fori Imperiali 25, Rome","check_in":"2026-05-10","check_out":"2026-05-14"}', '3 לילות', 1),
    (trip1_id, NEW.id, '2026-05-11', '09:00', '12:00', 'Activity 🎭', 'סיור בקולוסיאום', 25, 'EUR', 'Credit', '{"location":"Colosseum, Rome"}', 'לא לשכוח מים!', 2),
    (trip1_id, NEW.id, '2026-05-11', '13:00', '14:00', 'Food 🍽️', 'פיצה אמיתית', 18, 'EUR', 'Cash', '{"location":"Pizzeria Da Baffetto, Rome"}', 'הפיצה הכי טובה ברומא', 3),
    (trip1_id, NEW.id, '2026-05-12', '10:00', '15:00', 'Activity 🎭', 'מוזיאון הוותיקן', 30, 'EUR', 'Credit', '{"location":"Vatican Museums, Rome"}', 'להזמין כרטיסים מראש', 4),
    (trip1_id, NEW.id, '2026-05-13', '11:00', '13:00', 'Shopping 🛍️', 'קניות בשוק', 80, 'EUR', 'Cash', '{"location":"Campo de'' Fiori, Rome"}', 'מזכרות ואוכל מקומי', 5);

  -- Sample trip 2: Eilat weekend
  trip2_id := gen_random_uuid();
  INSERT INTO public.trips (id, user_id, name, destination, start_date, end_date, base_currency, status)
  VALUES (trip2_id, NEW.id, 'סופ"ש באילת 🏖️', 'אילת', '2026-04-03', '2026-04-05', 'ILS', 'Idea 💡');

  INSERT INTO public.events (trip_id, user_id, date, time, end_time, category, title, amount, currency, payment_method, details, notes, sort_order) VALUES
    (trip2_id, NEW.id, '2026-04-03', '07:00', '11:30', 'Transport 🚗', 'נסיעה לאילת', 250, 'ILS', 'Credit', '{"pickup_point":"תל אביב","dropoff_point":"אילת"}', 'דלק + אגרה', 0),
    (trip2_id, NEW.id, '2026-04-03', '14:00', null, 'Accommodation 🏨', 'מלון על הים', 800, 'ILS', 'Credit', '{"address":"שד'' התמרים, אילת","check_in":"2026-04-03","check_out":"2026-04-05"}', 'חדר עם נוף לים', 1),
    (trip2_id, NEW.id, '2026-04-04', '09:00', '12:00', 'Activity 🎭', 'שנורקלינג בחוף האלמוגים', 50, 'ILS', 'Cash', '{"location":"חוף האלמוגים, אילת"}', 'להביא קרם הגנה', 2),
    (trip2_id, NEW.id, '2026-04-04', '19:00', '21:00', 'Food 🍽️', 'ארוחת ערב בנמל', 200, 'ILS', 'Credit', '{"location":"נמל אילת"}', null, 3);

  RETURN NEW;
END;
$function$;
