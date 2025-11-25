// import { useTranslation } from "react-i18next";
import { useState, type KeyboardEventHandler } from "react";
// import { Input } from "@/app/components/ui/input";
// import { Button } from "@/app/components/ui/button";
// import { Eye, EyeOff } from "lucide-react";
import EyeOffIcon from "@/assets/img/icon/eye-off.png";
import IconWarning from "@/assets/img/icon/warning.png";

type Props = {
  name: string,
  placeholder: string;
  password: string;
  onPasswordChange: (password: string) => void;
  handleKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
  errorPrompt?: string;
};

export const WalletPasswordInput = ({
  name,
  placeholder,
  password,
  onPasswordChange,
  autoFocus = false,
  handleKeyDown,
  errorPrompt,
}: Props) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <>
      <div className="mt-[12px] flex h-[50px] items-center rounded-[12px] bg-[#1E2025]">
        <input
          name={name}
          value={password}
          onChange={(e) => {
            onPasswordChange(e.target.value);
          }}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={20}
          onKeyDown={handleKeyDown}
          className="ml-[24px] h-[24px] flex-1 border-none text-base"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="mr-[20px] ml-[20px] size-[20px] flex-initial"
          tabIndex={-1}
        >
          {showPassword ? <img src={EyeOffIcon} alt="eye" className="size-[20px]" /> : <img src={EyeOffIcon} alt="eye" className="size-[20px]" />}
        </button>
      </div>
      {errorPrompt && (
        <div className="mt-[12px] flex h-[50px] items-center rounded-[12px] bg-(--bc-error)">
          <img
            src={IconWarning}
            alt="warning"
            className="ml-[24px] h-[16px]"
          />
          <div className="mr-[24px] ml-[8px] text-[14px] leading-[16px] opacity-60">{errorPrompt}</div>
        </div>
      )}
    </>
  );
};
