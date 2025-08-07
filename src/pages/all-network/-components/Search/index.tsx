import { Container, StyledCircularProgress } from './styled';
import type { OutlinedInputProps } from '@/components/common/OutlinedInput';
import SearchIcon from "@/assets/img/icon/search.png";
import DeleteIcon from '@/assets/images/icons/Delete14.svg';
// import SearchIcon from '@/assets/images/icons/Search18.svg';

export type SearchProps = OutlinedInputProps & {
  searchPlaceholder?: string;
  isPending?: boolean;
  disableFilter?: boolean;
  onClickFilter?: () => void;
  onClear?: () => void;
};

export default function Search({ value, onChange, searchPlaceholder, isPending, onClear }: SearchProps) {
  return (
    <Container>
      <div className="w-full flex h-[40px] items-center rounded-[8px] bg-[#1E2025]">
        <img
          src={SearchIcon}
          alt="search"
          className="ml-[16px] size-[16px]"
        />
        <input
          type="text"
          value={value ? value.toString() : ""}
          placeholder={searchPlaceholder || 'Search'}
          className="!mr-[16px] !ml-[16px] flex-1 h-[20px] border-none !text-[16px] font-medium text-white outline-none focus:outline-none"
          onChange={onChange}
        />
        {
          isPending ? (
          <StyledCircularProgress size={16} />
          ) : value ? (
          <div className="mr-[16px]" onClick={onClear}>
            <DeleteIcon />
          </div>
          ) : null
        }
      </div>
    </Container>
  );
}
