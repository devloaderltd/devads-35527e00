SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'email_queue_service_role_key'),
  current_setting('app.settings.service_role_key', true)
);