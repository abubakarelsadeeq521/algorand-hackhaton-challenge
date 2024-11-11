
import * as React from 'react';

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success';
  children?: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'default', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-gray-100 text-gray-900',
      destructive: 'bg-red-50 text-red-700 border-red-200',
      success: 'bg-green-50 text-green-700 border-green-200'
    };

    return (
      <div
        ref={ref}
        className={`p-4 rounded-lg border ${variantStyles[variant]}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, ...props }, ref) => (
    <h5
      ref={ref}
      className="font-medium mb-1"
      {...props}
    >
      {children}
    </h5>
  )
);

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, ...props }, ref) => (
    <p
      ref={ref}
      className="text-sm"
      {...props}
    >
      {children}
    </p>
  )
);

Alert.displayName = 'Alert';
AlertTitle.displayName = 'AlertTitle';
AlertDescription.displayName = 'AlertDescription';