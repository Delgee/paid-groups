'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectApi } from '@/lib/api/projects';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeftIcon } from 'lucide-react';
import { MONGOLIAN_BANKS } from '@/lib/constants/banks';

const formSchema = z.object({
  bot_token: z.string()
    .min(1, 'Ботын токен шаардлагатай')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Ботын токены формат буруу байна'),
  bot_username: z.string()
    .min(1, 'Ботын хэрэглэгчийн нэр шаардлагатай. Токеноо шалгана уу.')
    .max(32, 'Хэрэглэгчийн нэр 32 тэмдэгтээс хэтрэх боломжгүй'),
  display_name: z.string()
    .min(2, 'Харагдах нэр дор хаяж 2 тэмдэгттэй байх ёстой')
    .max(255, 'Харагдах нэр 255 тэмдэгтээс хэтрэх боломжгүй'),
  description: z.string().max(512, 'Тайлбар 512 тэмдэгтээс хэтрэх боломжгүй').optional(),
  welcome_message: z.string()
    .min(10, 'Угтах мессеж дор хаяж 10 тэмдэгттэй байх ёстой')
    .max(4096, 'Угтах мессеж 4096 тэмдэгтээс хэтрэх боломжгүй'),
  account_bank_code: z.string().min(1, 'Банк сонгох шаардлагатай'),
  account_number: z.string().min(1, 'Дансны дугаар шаардлагатай').max(50, 'Дансны дугаар 50 тэмдэгтээс хэтрэх боломжгүй'),
  account_name: z.string().min(1, 'Дансны эзэмшигчийн нэр шаардлагатай').max(255, 'Дансны эзэмшигчийн нэр 255 тэмдэгтээс хэтрэх боломжгүй'),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastVerifiedToken, setLastVerifiedToken] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bot_token: '',
      bot_username: '',
      display_name: '',
      description: '',
      welcome_message: '',
      account_bank_code: '',
      account_number: '',
      account_name: '',
    },
  });

  const handleVerifyToken = async (botToken: string) => {
    if (!botToken || !botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      // Don't clear fields immediately - user might be editing
      return;
    }

    try {
      setVerifying(true);
      const botInfo = await projectApi.verifyToken(botToken);

      // Auto-fill fields
      form.setValue('bot_username', botInfo.username);
      form.setValue('display_name', botInfo.first_name);

      // Store the verified token
      setLastVerifiedToken(botToken);

      // Clear any existing errors
      form.clearErrors('bot_token');
      form.clearErrors('bot_username');
      form.clearErrors('display_name');

      toast.success(`@${botInfo.username} ботыг амжилттай баталгаажууллаа`);
    } catch (error: any) {
      // Clear fields on error
      form.setValue('bot_username', '');
      form.setValue('display_name', '');
      setLastVerifiedToken('');

      // Set error on bot_token field
      const errorMessage = error.response?.data?.error?.message || 'Ботын токен баталгаажуулж чадсангүй. Токен зөв эсэх болон бот идэвхтэй эсэхийг шалгана уу.';

      form.setError('bot_token', {
        type: 'manual',
        message: errorMessage,
      });
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitting(true);

      // Clean up empty strings for optional fields
      const payload = {
        ...data,
        description: data.description || undefined,
      };

      const project = await projectApi.create(payload);

      toast.success('Төсөл амжилттай үүслээ');

      // Redirect to project detail page
      router.push(`/dashboard/projects/${project.id}`);
    } catch (error: any) {
      console.error('Project creation error:', error);

      // Handle validation errors from backend
      const errorData = error.response?.data?.error || error.response?.data;

      if (errorData?.code === 'DUPLICATE_BOT_TOKEN' || error.response?.status === 409) {
        // Set error on specific field
        const errorMessage = errorData?.message || 'Энэ ботын токен аль хэдийн бүртгэлтэй байна. Өөр бот ашиглана уу.';

        form.setError('bot_token', {
          type: 'manual',
          message: errorMessage,
        });

        toast.error(`Төсөл үүсгэхэд алдаа гарлаа: ${errorMessage}`);
      } else if (errorData?.code === 'VALIDATION_ERROR' && errorData?.details?.field) {
        // Set error on the specific field mentioned in the error
        const fieldName = errorData.details.field as keyof FormData;
        form.setError(fieldName, {
          type: 'manual',
          message: errorData.message || 'Баталгаажуулалт амжилтгүй боллоо',
        });

        toast.error(`Баталгаажуулалтын алдаа: ${errorData.message || 'Маягтын алдааг шалгана уу'}`);
      } else if (error.response?.status === 401) {
        toast.error('Нэвтрэлтийн алдаа: Таны нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.');
      } else if (error.response?.status === 403) {
        toast.error('Эрх хүрэхгүй: Танд төсөл үүсгэх эрх байхгүй байна.');
      } else {
        // Generic error
        const message = errorData?.message || error.response?.data?.message || error.message || 'Төсөл үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.';

        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Буцах
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Төсөл үүсгэх</CardTitle>
          <CardDescription>
            Telegram боттой шинэ төсөл үүсгэх. Та дараа нь олон групп болон багцууд нэмж болно.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="bot_token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ботын токен *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                        type="password"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const newToken = e.target.value;

                          // Clear error when user starts typing
                          form.clearErrors('bot_token');

                          // Clear fields only if token has changed from verified one
                          if (lastVerifiedToken && newToken !== lastVerifiedToken) {
                            form.setValue('bot_username', '');
                            form.setValue('display_name', '');
                            setLastVerifiedToken('');
                          }
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          handleVerifyToken(e.target.value);
                        }}
                        disabled={verifying}
                      />
                    </FormControl>
                    <FormDescription>
                      {verifying ? (
                        <span className="text-blue-600">Ботын токен баталгаажуулж байна...</span>
                      ) : (
                        'Telegram дээрх @BotFather-аас ботын токен авна уу. Ботын мэдээлэл автоматаар бөглөгдөнө.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bot_username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ботын хэрэглэгчийн нэр *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Баталгаажуулалтын дараа автоматаар бөглөгдөнө"
                        {...field}
                        readOnly
                        disabled
                        className="bg-gray-50"
                      />
                    </FormControl>
                    <FormDescription>
                      Telegram API-аас автоматаар бөглөгдсөн (зөвхөн унших)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Харагдах нэр *</FormLabel>
                    <FormControl>
                      <Input placeholder="Төлбөртэй контент төсөл" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ботоос автоматаар бөглөгдсөн боловч та өөрчлөх боломжтой
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тайлбар</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Энэ төсөл олон төлбөртэй группүүдийг удирддаг..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Дотоод лавлагаанд зориулсан тайлбар (заавал биш)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="welcome_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Угтах мессеж *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Тавтай морил! Манай төлбөртэй группүүдэд хандахын тулд багц сонгоно уу."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Хэрэглэгчид /start командыг ашиглахад илгээгдэх мессеж
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Банкны дансны мэдээлэл</h3>
                <p className="text-sm text-muted-foreground">
                  QPay төлбөрийн холболтод зориулсан банкны дансны мэдээллийг тохируулах
                </p>

                <FormField
                  control={form.control}
                  name="account_bank_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Банк *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Банк сонгох" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MONGOLIAN_BANKS.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.name} ({bank.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Төлбөр боловсруулахад ашиглах банк сонгох
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дансны дугаар *</FormLabel>
                      <FormControl>
                        <Input placeholder="490000869" {...field} />
                      </FormControl>
                      <FormDescription>
                        Төлбөр хүлээн авах банкны дансны дугаар
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Дансны эзэмшигчийн нэр *</FormLabel>
                      <FormControl>
                        <Input placeholder="Тест данс 2" {...field} />
                      </FormControl>
                      <FormDescription>
                        Банкинд бүртгэгдсэн дансны эзэмшигчийн нэр
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting}
                  className="flex-1"
                >
                  Цуцлах
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Үүсгэж байна...' : 'Төсөл үүсгэх'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
