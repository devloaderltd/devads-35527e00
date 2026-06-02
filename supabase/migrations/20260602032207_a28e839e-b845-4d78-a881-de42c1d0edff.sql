-- favorites: explicit SELECT policy scoped to owner
CREATE POLICY "Users view own favorites"
  ON public.favorites FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- moderation_actions: allow mods/admins to insert; admins to delete
CREATE POLICY "Mods insert moderation actions"
  ON public.moderation_actions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = actor_id AND (
      public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
    )
  );

CREATE POLICY "Admins delete moderation actions"
  ON public.moderation_actions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
