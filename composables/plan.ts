export const usePlanId = () => {
  const planId = useState<string | undefined>();

  watchEffect(() => {
    if(planId.value) {
      localStorage.setItem(`plan_${planId.value}`, planId.value)
    }
  })

  return planId;
}
