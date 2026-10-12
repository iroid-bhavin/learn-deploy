import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/useAuth'
import { loginSchema, signupSchema } from '../validation/auth.schema'
import type { LoginInput, SignupInput } from '../validation/auth.schema'

const inputClass = 'w-full rounded border px-3 py-2 focus:outline-none'

interface FieldProps {
  registration: UseFormRegisterReturn
  error?: FieldError
  placeholder: string
  type?: string
}

function Field({ registration, error, placeholder, type = 'text' }: FieldProps) {
  return (
    <div className="w-full">
      <input
        {...registration}
        type={type}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`${inputClass} ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
    </div>
  )
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Please wait…' : label}
    </button>
  )
}

function LoginForm() {
  const { login } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data)
    } catch (err) {
      setError('root', { message: (err as Error).message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <Field registration={register('email')} error={errors.email} type="email" placeholder="Email" />
      <Field registration={register('password')} error={errors.password} type="password" placeholder="Password" />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton loading={isSubmitting} label="Log in" />
    </form>
  )
}

function SignupForm() {
  const { signup } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (data: SignupInput) => {
    try {
      await signup(data)
    } catch (err) {
      setError('root', { message: (err as Error).message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <div className="flex gap-2">
        <Field registration={register('firstName')} error={errors.firstName} placeholder="First name" />
        <Field registration={register('lastName')} error={errors.lastName} placeholder="Last name" />
      </div>
      <Field registration={register('email')} error={errors.email} type="email" placeholder="Email" />
      <Field
        registration={register('password')}
        error={errors.password}
        type="password"
        placeholder="Password (min 8 characters)"
      />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton loading={isSubmitting} label="Sign up" />
    </form>
  )
}

export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg bg-white p-6 shadow">
      <h1 className="mb-4 text-xl font-semibold">{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      {mode === 'login' ? <LoginForm /> : <SignupForm />}
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="mt-4 text-sm text-blue-600 hover:underline cursor-pointer"
      >
        {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
      </button>
    </div>
  )
}
