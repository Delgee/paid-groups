'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const registerSchema = z.object({
  email: z.string().email('Зөв имэйл хаяг оруулна уу'),
  password: z.string().min(8, 'Нууц үг дор хаяж 8 тэмдэгттэй байх ёстой')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Нууц үг том үсэг, жижиг үсэг, тоо агуулсан байх ёстой'),
  name: z.string().min(2, 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой'),
  phone: z.string().regex(/^\d{8}$/, 'Утасны дугаар яг 8 оронтой байх ёстой'),
  register_number: z.string().length(10, 'Регистрийн дугаар яг 10 тэмдэгттэй байх ёстой'),
  company_name: z.string().min(2, 'Компанийн нэр дор хаяж 2 тэмдэгттэй байх ёстой').optional(),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Нууц үг таарахгүй байна",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Бүртгэлийн үед алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>Бүртгэл үүсгэх</CardTitle>
        <CardDescription>
          Манай платформоор Telegram группүүдээ удирдаж эхлээрэй
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Овог нэр</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              required
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-red-600 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Утасны дугаар</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="99112210"
              maxLength={8}
              required
              {...register('phone')}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-red-600 text-sm">{errors.phone.message}</p>
            )}
            <p className="text-xs text-gray-500">
              8 оронтой (жишээ нь: 99112210)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="register_number">Регистрийн дугаар (РД)</Label>
            <Input
              id="register_number"
              type="text"
              placeholder="АМ05321712"
              maxLength={10}
              required
              {...register('register_number')}
              className={errors.register_number ? 'border-red-500' : ''}
            />
            {errors.register_number && (
              <p className="text-red-600 text-sm">{errors.register_number.message}</p>
            )}
            <p className="text-xs text-gray-500">
              10 тэмдэгттэй (жишээ нь: АМ05321712)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">
              Компанийн нэр <span className="text-gray-500 font-normal">(Заавал биш)</span>
            </Label>
            <Input
              id="company_name"
              type="text"
              autoComplete="organization"
              placeholder="Оруулаагүй бол автоматаар үүснэ"
              {...register('company_name')}
              className={errors.company_name ? 'border-red-500' : ''}
            />
            {errors.company_name && (
              <p className="text-red-600 text-sm">{errors.company_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Имэйл хаяг</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-red-600 text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Нууц үг</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              {...register('password')}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-red-600 text-sm">{errors.password.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Нууц үг том үсэг, жижиг үсэг, тоо агуулсан байх ёстой
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Нууц үг баталгаажуулах</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-red-600 text-sm">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Бүртгэл үүсгэж байна...
              </>
            ) : (
              'Бүртгэл үүсгэх'
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Бүртгэлтэй юу?{' '}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Нэвтрэх
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}